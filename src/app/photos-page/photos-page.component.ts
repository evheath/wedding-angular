import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { UploadService } from './upload.service';
import { SnackbarService } from '../snackbar.service';
import { UserService } from '../user.service';
import { UploadDataModel } from './upload.model';
import { MatDialog } from '@angular/material/dialog';
import { DeletionDialogueComponent } from './deletion-dialogue/deletion-dialogue.component';

@Component({
  selector: 'app-photos-page',
  templateUrl: './photos-page.component.html',
  styleUrls: ['./photos-page.component.scss']
})
export class PhotosPageComponent implements OnInit, OnDestroy {
  public isHovering: boolean;
  public files: File[] = [];
  public doingWork: boolean;

  @ViewChild('fileInput') fileInput: ElementRef

  constructor(
    public storage: AngularFireStorage,
    public db: AngularFirestore,
    public user: UserService,
    private snack: SnackbarService,
    public ups: UploadService,
    public dialog: MatDialog,
  ) {
  }

  // needed for canDeactivate
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (this.hasUnsavedData()) {
      $event.returnValue = true;
    }
  }
  public hasUnsavedData(): boolean {
    return this.doingWork
  }


  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  onDrop(files: FileList) {
    // console.log('user dropped file(s)')
    for (let i = 0; i < files.length; i++) {
      this.files.push(files.item(i));
    }

    this.startUpload()
  }

  public async startUpload() {
    this.doingWork = true;

    try {

      for (const file of this.files) {
        const timestamp = Date.now()
        const path = `uploads/${timestamp}_${file.name}`;

        await this.storage.upload(path, file)

        const storageRef = this.storage.ref(path);
        const downloadURL = await storageRef.getDownloadURL().toPromise();
        let newUpload: UploadDataModel = {
          path,
          downloadURL,
          likers: [],
          uid: this.user.uid,
          name: this.user.name,
          timestamp,
        }
        await this.db.doc<UploadDataModel>(path).set(newUpload)
      }
      this.snack.simple("Images(s) uploaded!");

      // since new data will be added to the 'top' of the collection
      // we may as well restart the query after successful upload
      this.ups.initUploads();
    } catch (e) {
      console.error(e)
      this.snack.simple("Problem uploading your image(s)");
    } finally {
      // clean up
      this.files.splice(0);
      this.fileInput.nativeElement.value = null // clears out the 'choose file' button
      this.doingWork = false;
    }



  }


  public isOwner(upload: UploadDataModel) {
    return upload.uid === this.user.uid
  }

  private async deleteUpload(upload: UploadDataModel) {
    try {
      // the deletion of the actual image happens via firebase functions
      await this.db.doc(upload.path).delete()
      this.snack.simple("Upload deleted")
      this.ups.initUploads() // need to clear out stale data, may as well restart
    } catch (e) {
      console.error(e)
      this.snack.simple("Problem deleting upload")
    }
  }

  public async openDialog(upload: UploadDataModel) {
    const deleteYesNo = await this.dialog.open(DeletionDialogueComponent, {
      // width: '250px',
      data: upload,
    }).afterClosed().toPromise()

    if (deleteYesNo) {
      this.deleteUpload(upload);
    }
  }


  ngOnInit(): void {
    this.doingWork = false;
    this.ups.initUploads();
  }
  ngOnDestroy(): void {
  }
}
